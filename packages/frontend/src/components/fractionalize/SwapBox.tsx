import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Box,
  Button,
  Flex,
  HStack,
  Select,
  Text,
  VStack,
  useDisclosure,
} from '@chakra-ui/react'
import { ChevronDownIcon } from '@chakra-ui/icons'
import { request, gql } from 'graphql-request'
import { FC, useEffect, useState } from 'react'
import 'twin.macro'
import grinderABI from '../../shared/abi/grinder.json'
import erc721ABI from '../../shared/abi/erc721.json'
import {
  useAccount,
  useContract,
  useContractRead,
  useContractWrite,
  usePrepareContractWrite,
  useProvider,
} from 'wagmi'

type CollectionResponse = {
  id: string
  name: string
  tokens: TokenResponse[] | null
}
type TokenResponse = {
  id: number
}

type Token = {
  id: string
  owner: string
  tokenId: string
  collection: TokenResponse[]
}

import { azukiAddress, grinderAddress, nftAddress } from '@components/exchange/Exchange'
import { env } from '@shared/environment'

export const SwapBox: FC = () => {
  const { isOpen, onOpen, onClose } = useDisclosure()
  const [nftName, setNftName] = useState('#')
  const [nftList, setData] = useState<CollectionResponse[]>([])
  const [tokenList, setTokenList] = useState<Token[]>([])
  const [selectedToken, setSelectedToken] = useState<number>()
  const { address } = useAccount()
  const { data, isError, isLoading } = useContractRead({
    address: nftName,
    abi: erc721ABI,
    functionName: 'isApprovedForAll',
    args: [address, grinderAddress],
  })

  console.log('isApprovedForAll', data)

  const { config } = usePrepareContractWrite({
    abi: grinderABI,
    address: grinderAddress,
    functionName: 'fractionalizeNFT',
    args: [nftName, selectedToken],
  })
  const { write, isLoading: grindLoading } = useContractWrite(config)

  const { config: nftConfig } = usePrepareContractWrite({
    abi: erc721ABI,
    address: nftName,
    functionName: 'setApprovalForAll',
    args: [grinderAddress, true],
  })

  const { write: approveNft, isLoading: approveLoading } = useContractWrite(nftConfig)

  const handleSelectNFT = async (e: any) => {
    const nft = e.target.value
    setNftName(nft)
    const response: { tokens: Token[] } = await request(
      env.graphEndPoint,
      gql`
        query GetTokensByOwnerAndCollection($owner: Bytes!, $collection: Bytes) {
          tokens(where: { owner: $owner, collection: $collection }) {
            id
            owner
            tokenId
            collection {
              id
            }
          }
        }
      `,
      { owner: address, collection: nft },
    )
    setTokenList(response.tokens)
    setSelectedToken(0)
    console.log(response)
  }

  const handleSelectId = async (e: any) => {
    const tokenId = e.target.value
    setSelectedToken(tokenId)
  }

  const fractionalise = async () => {
    write?.()
  }

  const approve = () => {
    approveNft?.()
  }

  useEffect(() => {
    const getCollectionList = async () => {
      const response: {
        collections: CollectionResponse[]
      } = await request(
        env.graphEndPoint,
        gql`
          query getCollection {
            collections {
              id
              name
              tokens {
                id
              }
            }
          }
        `,
        {},
      )
      console.log(response)
      setData(
        response.collections.map((collection) => ({
          id: collection.id,
          name: collection.name,
          tokens: [],
        })),
      )
    }
    try {
      getCollectionList()
    } catch (error) {
      console.log(error)
    }
  }, [])
  console.log(data)
  return (
    <>
      <VStack
        gap={3}
        background="#13212D"
        padding={29}
        borderRadius={12}
        maxWidth="60%"
        width="100%"
        display="flex"
        alignItems="baseline"
      >
        <Text fontSize="x-large" fontWeight={700}>
          Fractionalize
        </Text>
        <Flex
          background="white"
          width="100%"
          borderRadius="16px"
          padding="30px"
          color="black"
          display="flex"
          alignItems="center"
          justifyContent="center"
        >
          <Select placeholder="Select NFT" onChange={handleSelectNFT}>
            {nftList.map((nft) => (
              <option value={nft.id} key={nft.id}>
                {nft.name}
              </option>
            ))}
          </Select>
          {nftName !== '#' && (
            <Select placeholder="Select Token ID" onChange={handleSelectId}>
              {tokenList.map((token) => (
                <option value={token.tokenId} key={token.tokenId}>
                  {token.tokenId}
                </option>
              ))}
            </Select>
          )}
        </Flex>
        <Box
          padding="0px 9px"
          fontSize="x-large"
          background="black"
          borderRadius="10px"
          position="absolute"
          bottom="50%"
          left="48.5%"
        >
          <ChevronDownIcon />
        </Box>
        <Flex
          background="#2d3748"
          width="100%"
          borderRadius="16px"
          padding="30px"
          display="flex"
          alignItems="center"
          justifyContent="start"
        >
          <Text>
            1,000,000{' '}
            {nftList.find((nft) => nft.id === nftName)
              ? nftList.find((nft) => nft.id === nftName)?.name
              : ''}
            #{selectedToken}
          </Text>
        </Flex>
        {data ? (
          <Button
            isLoading={grindLoading}
            onClick={() => {
              fractionalise()
            }}
            background="#4A99E9"
            width="100%"
            borderRadius="16px"
            padding="30px"
            display="flex"
            alignItems="center"
            justifyContent="center"
          >
            <Text>Swap</Text>
          </Button>
        ) : (
          <Button
            isLoading={approveLoading}
            onClick={() => {
              approve()
            }}
            background="#4A99E9"
            width="100%"
            borderRadius="16px"
            padding="30px"
            display="flex"
            alignItems="center"
            justifyContent="center"
          >
            <Text>Approve</Text>
          </Button>
        )}
      </VStack>
      {approveLoading ? <ApprovalModal /> : <SwapModal />}
    </>
  )
}

const ApprovalModal: FC = () => {
  const { isOpen, onOpen, onClose } = useDisclosure()
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalOverlay />
      <ModalContent top="19%" height="50%">
        <ModalBody
          display="flex"
          flexDirection="column"
          justifyContent="center"
          gap="5px"
        ></ModalBody>
      </ModalContent>
    </Modal>
  )
}

const SwapModal: FC = () => {
  const { isOpen, onOpen, onClose } = useDisclosure()
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalOverlay />
      <ModalContent top="19%" height="50%">
        <ModalBody display="flex" flexDirection="column" justifyContent="center" gap="5px">
          wait for swap
        </ModalBody>

        <ModalFooter>
          <Button width="100%" colorScheme="blue" mr={3}>
            Claim
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
